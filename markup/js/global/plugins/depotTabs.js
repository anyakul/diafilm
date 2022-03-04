/**
 * @name depotTabs *
 * @version 3.1.0
 * @author Виктор Дмитриевцев <v.dmitrievcev@designdepot.ru>
 * @see git@git.designdepot.ru:frontend/depotTabs.git
 * @license MIT
 * @changes:
 * - fix: поправил ввод с клавиатуры
 * - add: Добавил методы `getNextTabSlug(?$tab)` и `getPrevTabSlug(?$tab)`
 */

(function ($) {
    'use strict';

    function DepotTabs(container, settings) {
        var self = this;

        return self.call(self._init, container, settings);
    }

    DepotTabs.prototype = $.extend(true, {}, $.depotProto, {
        pluginName: 'depotTabs',
        defaults: {
            tabListSelector: '.js-tabs-list',
            tabsSelector: '.js-tabs-tab',
            panelsSelector: '.js-tabs-panel',
            useHash: false,
            hashParam: 'tab',
            cache: true,
            beforeChange: null,
            onChange: null
        },

        getHashRe: function (param) {
            var self = this;
            if (param === undefined) {
                param = self.params.hashParam;
            }
            return new RegExp('^' + param + '=(.*)$', 'i');
        },

        getHashString: function (value, param) {
            var self = this;
            if (param === undefined) {
                param = self.params.hashParam;
            }
            return [param, value].join('=');
        },

        getTabSlug: function ($tab) {
            var slug;

            if ($tab && $tab.length) {
                slug = $tab.aria('controls');
            }

            return slug;
        },

        getFirstTabSlug: function () {
            var self = this;

            var $firstTab;
            if (self.params.cache) {
                $firstTab = self.$tabs.first();
            } else {
                $firstTab = self.$container.find(self.params.tabListSelector).first();
            }

            return self.getTabSlug($firstTab);
        },

        getValidTabSlug: function (tabSlug) {
            var self = this;
            var validTabSlug;

            if (self.params.cache) {
                if (self.cache.tabs[tabSlug] && self.cache.panels[tabSlug]) {
                    validTabSlug = tabSlug;
                } else if (!self.state.activeTabSlug) {
                    validTabSlug = self.getFirstTabSlug();
                }
            } else {
                var $target = self.getTab(tabSlug);
                if ($target.length) {
                    validTabSlug = tabSlug;
                } else if (!self.state.activeTabSlug) {
                    validTabSlug = self.getFirstTabSlug();
                }
            }

            return validTabSlug;
        },

        getActiveTabSlug: function () {
            var self = this;

            var $activeTab = self.getActiveTab();

            return self.getTabSlug($activeTab);
        },

        getNextTabSlug: function ($tab) {
            var self = this;

            if ($tab === undefined) {
                $tab = self.getActiveTab();
            }
            if (!self.params.cache) {
                self.$tabs = self.$tabList.find(self.params.tabsSelector);
            }

            var $nextTab = $tab.next(self.params.tabsSelector);

            if (!$nextTab.length) {
                $nextTab = self.$tabs.first();
            }

            return self.getTabSlug($nextTab);
        },

        getPrevTabSlug: function ($tab) {
            var self = this;

            if ($tab === undefined) {
                $tab = self.getActiveTab();
            }

            if (!self.params.cache) {
                self.$tabs = self.$tabList.find(self.params.tabsSelector);
            }

            var $prevTab = $tab.prev(self.params.tabsSelector);

            if (!$prevTab.length) {
                $prevTab = self.$tabs.last();
            }

            return self.getTabSlug($prevTab);
        },

        getPanelSlug: function ($panel) {
            var slug;

            if ($panel && $panel.length) {
                slug = $panel.attr('id');
            }

            return slug;
        },

        getNextPanelSlug: function () {
            var self = this;

            if (!self.params.cache) {
                self.$panels = self.$container.children(self.params.panelsSelector);
            }

            if (!self.state.$activePanel) {
                self.state.$activePanel = self.$panels.first();
            }

            var $nextPanel = self.state.$activePanel.next(self.params.panelsSelector);

            if (!$nextPanel.length) {
                $nextPanel = self.$panels.first();
            }

            return self.getPanelSlug($nextPanel);
        },

        getPrevPanelSlug: function () {
            var self = this;

            if (!self.params.cache) {
                self.$panels = self.$container.children(self.params.panelsSelector);
            }

            if (!self.state.$activePanel) {
                self.state.$activePanel = self.$panels.first();
            }

            var $prevPanel = self.state.$activePanel.prev(self.params.panelsSelector);

            if (!$prevPanel.length) {
                $prevPanel = self.$panels.last();
            }

            return self.getPanelSlug($prevPanel);
        },

        cacheTabs: function () {
            var self = this;

            self.cache.tabs = self.cleanObject();

            self.$tabs.each(function () {
                var $tab = $(this);
                var tabSlug = self.getTabSlug($tab);

                self.cache.tabs[tabSlug] = $tab;
            });
        },

        cachePanels: function () {
            var self = this;

            self.cache.panels = self.cleanObject();

            self.$panels.each(function () {
                var $panel = $(this);
                var tabSlug = self.getPanelSlug($panel);

                self.cache.panels[tabSlug] = $panel;
            });
        },

        getTab: function (tabSlug) {
            var self = this;

            return self.$tabList.find(self.params.tabsSelector + '[aria-controls="' + tabSlug + '"]');
        },

        getPanel: function (tabSlug) {
            var self = this;

            return self.$container.children(self.params.panelsSelector + '[id="' + tabSlug + '"]');
        },

        getActiveTab: function () {
            var self = this;

            var $activeTab;
            if (self.params.cache) {
                $activeTab = self.$tabs.filter('[aria-selected="true"]');
            } else {
                $activeTab = self.$tabList.find(self.params.tabsSelector + '[aria-selected="true"]');
            }

            return $activeTab;
        },

        getActivePanel: function () {
            var self = this;

            var $activepanel;
            if (self.params.cache) {
                $activepanel = self.$panels.filter('[aria-hidden="false"]');
            } else {
                $activepanel = self.$container.children(self.params.panelsSelector + '[aria-hidden="false"]');
            }

            return $activepanel;
        },

        changeTo: function (tabSlug, focus) {
            var self = this;

            if (!self.state.activeTabSlug || self.state.activeTabSlug !== tabSlug) {
                var $newTab;
                var $newPanel;
                var oldTabSlug = self.state.activeTabSlug;

                if (self.params.cache) {
                    $newTab = self.cache.tabs[tabSlug];
                    $newPanel = self.cache.panels[tabSlug];
                } else {
                    $newTab = self.getTab(tabSlug);
                    $newPanel = self.getPanel(tabSlug);
                }

                if ($newTab && $newPanel && $newTab.length && $newPanel.length) {
                    self.call(self.params.beforeChange, self.$container, self.state.$activePanel);

                    self.setInactiveTab(self.getActiveTab());
                    self.setInactivePanel(self.getActivePanel());

                    self.setActiveTab($newTab, focus);
                    self.setActivePanel($newPanel);

                    self.state.activeTabSlug = tabSlug;
                    self.state.$activeTab = $newTab;
                    self.state.$activePanel = $newPanel;

                    self.$WINDOW.trigger('update');

                    if (self.params.useHash && self.hasPlugin('depotHash')) {
                        if (oldTabSlug) {
                            $.depotHash.replaceMatched(self.getHashRe(), self.getHashString(tabSlug), false);
                        } else {
                            $.depotHash.add(self.getHashString(tabSlug), false);
                        }
                    }

                    self.call(self.params.onChange, self.$container, self.state.$activePanel);
                }
            }

            return self;
        },

        changeToFirst: function () {
            var self = this;

            self.changeTo(self.getFirstTabSlug());
        },

        setActivePanel: function ($panel) {
            var self = this;

            if ($panel && $panel.length) {
                $panel.aria('hidden', 'false');
                $panel.attr('tabindex', '0');
            }

            return $panel;
        },

        setInactivePanel: function ($panel) {
            var self = this;

            if ($panel && $panel.length) {
                $panel.aria('hidden', 'true');
                $panel.attr('tabindex', '-1');
            }

            return $panel;
        },

        setActiveTab: function ($tab, focus) {
            var self = this;

            if ($tab && $tab.length) {
                $tab.aria('selected', 'true')
                    .attr('tabindex', '0');

                if (focus) {
                    $tab.get(0).focus();
                }
            }

            return $tab;
        },

        setInactiveTab: function ($tab) {
            var self = this;

            if ($tab && $tab.length) {
                $tab.aria('selected', 'false')
                    .attr('tabindex', '-1');
            }

            return $tab;
        },

        disableTab: function ($tab) {
            var self = this;

            if ($tab && $tab.length) {
                $tab.aria('disabled', 'true');
            }

            return $tab;
        },

        enableTab: function ($tab) {
            var self = this;

            if ($tab && $tab.length) {
                $tab.aria('disabled', 'false');
            }

            return $tab;
        },

        bindEvents: function () {
            var self = this;

            self.$tabList.on('click', self.params.tabsSelector, function (event) {
                if (event.target === this) {
                    event.preventDefault();
                }
                var $tab = $(this);

                self.debounce('tabClick', function () {
                    self.changeTo(self.getTabSlug($tab), true);
                });
            });

            self.$tabList.on('keydown', self.params.tabsSelector, function (event) {
                var $tab = $(this);
                if (event.which === self.KEYS.SPACE || event.which === self.KEYS.ENTER) {
                    if (event.target === this) {
                        event.preventDefault();
                    }
                    self.debounce('tabClick', function () {
                        self.changeTo(self.getTabSlug($tab), true);
                    });
                } else if (event.which === self.KEYS.ARROW_LEFT) {
                    if (event.target === this) {
                        event.preventDefault();
                    }
                    self.debounce('tabClick', function () {
                        self.changeTo(self.getPrevTabSlug($tab), true);
                    });
                } else if (event.which === self.KEYS.ARROW_RIGHT) {
                    if (event.target === this) {
                        event.preventDefault();
                    }
                    self.debounce('tabClick', function () {
                        self.changeTo(self.getNextTabSlug($tab), true);
                    });
                }
            });

            if (self.params.useHash) {
                if (self.hasPlugin('depotHash')) {
                    $.depotHash.onChange(function () {
                        var nextTabSlug;

                        $.depotHash.getMatched(self.getHashRe(), function (value, matches) {
                            if (matches && matches[1]) {
                                nextTabSlug = self.getValidTabSlug(matches[1]);
                            }
                        });

                        if (nextTabSlug) {
                            self.changeTo(nextTabSlug, false);
                        }
                    });
                }
            }

            return self;
        },

        init: function () {
            var self = this;

            if (self.params.cache) {
                self.state.$activeTab = self.getActiveTab();
                self.state.$activePanel = self.getActivePanel();

                self.cacheTabs();
                self.cachePanels();
            }

            var activeTabSlug = self.getActiveTabSlug();

            if (!activeTabSlug) {
                activeTabSlug = self.getFirstTabSlug();
            }

            if (self.params.useHash) {
                if (self.hasPlugin('depotHash')) {
                    $.depotHash.getMatched(self.getHashRe(), function (value, matches) {
                        if (matches && matches[1]) {
                            activeTabSlug = self.getValidTabSlug(matches[1]);
                        }
                    });
                } else {
                    self.params.useHash = false;
                }
            }

            self.changeTo(activeTabSlug, false);

            self.call(self.params.onInit);

            return self;
        }
    });

    $.fn.depotTabs = function (settings) {
        return this.each(function (i, container) {
            $.data(this, 'depotTabs', new DepotTabs(container, settings));
        });
    };
}(jQuery));
